import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).parents[1] / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


controller = module('controller', 'ci-controller.py')
gateway = module('gateway', 'ci-gateway.py')
RELEASE = 'a' * 40 + '-12345-1'


def archive_bytes(entries):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode='w') as archive:
        for name, content in entries:
            member = tarfile.TarInfo(name)
            member.size = len(content)
            archive.addfile(member, io.BytesIO(content))
    return stream.getvalue()


class DeploymentSecurityTests(unittest.TestCase):
    def test_gateway_rejects_shell_and_unrelated_commands(self):
        for command in ['bash', 'sudo id', 'status; id', 'receive ../other-app',
                        f'deploy {RELEASE} true; id', f'deploy {RELEASE} yes', 'internal-sftp']:
            with self.subTest(command=command), self.assertRaises(ValueError):
                gateway.arguments(command)
        self.assertEqual(gateway.arguments(f'deploy {RELEASE} false'), ['deploy', RELEASE, 'false'])

    def test_receiver_refuses_traversal_and_symlinks(self):
        with tempfile.TemporaryDirectory() as temp:
            deployment = controller.Deployment(Path(temp))
            bad = archive_bytes([('../metadata.json', b'{}'), ('image.tar.gz', b'x')])
            with self.assertRaises(controller.DeploymentError):
                deployment.receive(RELEASE, io.BytesIO(bad))
            self.assertFalse((Path(temp).parent / 'metadata.json').exists())
            stream = io.BytesIO()
            with tarfile.open(fileobj=stream, mode='w') as archive:
                link = tarfile.TarInfo('metadata.json')
                link.type = tarfile.SYMTYPE
                link.linkname = '/etc/shadow'
                archive.addfile(link)
                archive.addfile(tarfile.TarInfo('image.tar.gz'))
            with self.assertRaises(controller.DeploymentError):
                deployment.receive(RELEASE, io.BytesIO(stream.getvalue()))

    def test_image_with_foreign_application_tag_is_never_loaded(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'image.tar.gz'
            with tarfile.open(path, 'w:gz') as archive:
                content = json.dumps([{'RepoTags': ['unrelated-app:latest']}]).encode()
                member = tarfile.TarInfo('manifest.json')
                member.size = len(content)
                archive.addfile(member, io.BytesIO(content))
            with self.assertRaises(controller.DeploymentError):
                controller.validate_image_archive(path, 'pginfo-backend:' + RELEASE)

    def test_pending_migration_requires_explicit_reviewed_dispatch(self):
        audit = {'databaseAuthenticated': True, 'strictCertificateVerification': True,
                 'pendingMigrations': ['new_column'], 'checksumMismatches': [], 'unresolvedMigrations': []}
        with self.assertRaises(controller.DeploymentError):
            controller.Deployment.check_migrations(audit, False)
        controller.Deployment.check_migrations(audit, True)
        audit['checksumMismatches'] = ['changed_old_migration']
        with self.assertRaises(controller.DeploymentError):
            controller.Deployment.check_migrations(audit, True)

    def test_failed_new_worker_rolls_back_before_current_pointer_changes(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            previous = base / 'releases' / 'previous'
            candidate = base / 'releases' / RELEASE
            previous.mkdir(parents=True)
            candidate.mkdir()
            try:
                (base / 'current').symlink_to(previous, target_is_directory=True)
            except OSError as error:
                if getattr(error, 'winerror', None) == 1314:
                    self.skipTest('Windows symlink privilege unavailable; this test runs on Linux CI/VPS')
                raise
            calls = []

            def runner(args, timeout=180):
                calls.append(args)
                if str(candidate) in args and 'up' in args:
                    raise controller.DeploymentError('New worker unhealthy')
                return ''

            deployment = controller.Deployment(base, runner)
            with self.assertRaisesRegex(controller.DeploymentError, 'previous application release restored'):
                deployment.activate(candidate, previous)
            self.assertEqual((base / 'current').resolve(), previous)
            self.assertTrue(any(str(previous) in c and 'up' in c for c in calls))
            self.assertFalse(any('migrate' in c for c in calls))


if __name__ == '__main__':
    unittest.main()
