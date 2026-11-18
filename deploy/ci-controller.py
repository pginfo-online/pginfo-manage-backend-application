#!/usr/bin/python3 -I
"""Root-owned, narrowly scoped receiver and application rollout controller."""
try:
    import fcntl
except ImportError:
    fcntl = None
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

RELEASE = re.compile(r'[a-f0-9]{40}-[0-9]{1,20}-[0-9]{1,5}')
SOURCE = 'https://github.com/pginfo-online/pginfo-manage-backend-application'
MAX_UPLOAD = 1536 * 1024 * 1024
MAX_EXPANDED = 4 * 1024 * 1024 * 1024


class DeploymentError(Exception):
    pass


def execute(args, timeout=180):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout,
                            env={**os.environ, 'PATH': '/usr/sbin:/usr/bin:/sbin:/bin'})
    if result.returncode:
        # Container stderr may contain application data. Never forward it to CI logs.
        raise DeploymentError(f'{Path(args[0]).name} failed (exit {result.returncode}); inspect VPS service logs')
    return result.stdout


def validate_release(release):
    if not RELEASE.fullmatch(release):
        raise DeploymentError('Invalid immutable release ID')
    return release[:40]


def validate_image_archive(path, expected_tag):
    """Docker loads only this release's tag; foreign application tags are refused."""
    manifests = []
    expanded = 0
    with tarfile.open(path, mode='r|gz') as archive:
        for member in archive:
            expanded += member.size + 512
            if expanded > MAX_EXPANDED:
                raise DeploymentError('Image exceeds expanded size limit')
            if member.name == 'manifest.json':
                if not member.isfile() or member.size > 1024 * 1024:
                    raise DeploymentError('Invalid Docker manifest')
                manifests.append(json.load(archive.extractfile(member)))
    if len(manifests) != 1 or len(manifests[0]) != 1:
        raise DeploymentError('Exactly one Docker image is required')
    if manifests[0][0].get('RepoTags') != [expected_tag]:
        raise DeploymentError('Docker archive contains an unexpected image tag')


class Deployment:
    def __init__(self, base=Path('/opt/pginfo'), runner=execute):
        self.base = Path(base)
        self.runner = runner

    def log(self, event, **fields):
        record = {'time': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                  'event': event, **fields}
        state = self.base / 'state'
        state.mkdir(mode=0o700, exist_ok=True)
        with (state / 'deployments.jsonl').open('a') as handle:
            handle.write(json.dumps(record) + '\n')
        print(json.dumps(record), flush=True)

    def compose(self, directory, *args, timeout=180):
        return self.runner(['/usr/bin/docker', 'compose', '--project-name', 'pginfo-prod',
                            '--project-directory', str(directory), '--env-file',
                            str(directory / '.env.compose'), '-f',
                            str(directory / 'compose.production.yml'), *args], timeout=timeout)

    def receive(self, release, stream):
        validate_release(release)
        incoming = self.base / 'incoming'
        incoming.mkdir(mode=0o700, exist_ok=True)
        target = incoming / (release + '.tar')
        if target.exists() or (self.base / 'releases' / release).exists():
            raise DeploymentError('Release ID already exists; rerun Actions with a new attempt')
        temporary = incoming / (release + '.partial')
        digest = hashlib.sha256()
        try:
            size = 0
            with temporary.open('xb') as handle:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    size += len(chunk)
                    if size > MAX_UPLOAD:
                        raise DeploymentError('Upload exceeds size limit')
                    handle.write(chunk)
                    digest.update(chunk)
            with tarfile.open(temporary, 'r:') as archive:
                members = archive.getmembers()
                if len(members) != 2 or {m.name for m in members} != {'image.tar.gz', 'metadata.json'}:
                    raise DeploymentError('Bundle must contain only image.tar.gz and metadata.json')
                if any(not m.isfile() for m in members):
                    raise DeploymentError('Links and non-regular bundle entries are forbidden')
            temporary.rename(target)
            self.log('received', release=release, bytes=size, sha256=digest.hexdigest())
        finally:
            temporary.unlink(missing_ok=True)

    def readiness(self):
        self.runner(['/usr/bin/curl', '--resolve', 'pginfo.space:443:127.0.0.1',
                     '--max-time', '15', '--fail', '--silent', '--show-error',
                     'https://pginfo.space/health/ready'], timeout=20)

    def rollback(self, previous):
        self.compose(previous, 'up', '-d', '--no-build', '--no-deps', '--wait',
                     '--wait-timeout', '180', 'api', 'worker', timeout=240)
        self.readiness()
        self.log('rollback_healthy', release=previous.name)

    def activate(self, directory, previous):
        """Only replace the current pointer after healthy app and queue delivery."""
        try:
            self.compose(directory, 'up', '-d', '--no-build', '--no-deps', '--wait',
                         '--wait-timeout', '180', 'api', 'worker', timeout=240)
            self.compose(directory, 'exec', '-T', 'api', 'node', 'deploy/verify-runtime.mjs', timeout=60)
            self.readiness()
        except Exception:
            self.log('activation_failed', release=directory.name)
            try:
                self.rollback(previous)
            except Exception:
                self.log('rollback_failed', release=previous.name)
                raise DeploymentError('Deployment and automatic application rollback failed; administrator action required')
            raise DeploymentError('Deployment failed; previous application release restored and healthy')
        pointer = self.base / 'current.next'
        pointer.unlink(missing_ok=True)
        pointer.symlink_to(directory)
        pointer.replace(self.base / 'current')

    def deploy(self, release, allow_migrations):
        commit = validate_release(release)
        source = self.base / 'incoming' / (release + '.tar')
        directory = self.base / 'releases' / release
        previous = (self.base / 'current').resolve(strict=True)
        if previous.parent != (self.base / 'releases').resolve():
            raise DeploymentError('Current release points outside the managed release directory')
        if directory.exists():
            raise DeploymentError('Immutable release already exists')
        if shutil.disk_usage(self.base).free < 3 * 1024 ** 3:
            raise DeploymentError('At least 3 GiB free disk space is required')
        redis = json.loads(self.runner(['/usr/bin/docker', 'inspect', 'pginfo-prod-redis-1'], timeout=20))[0]
        if redis['State'].get('Health', {}).get('Status') != 'healthy':
            raise DeploymentError('Existing PgInfo Redis is not healthy; no rollout attempted')
        expected = 'pginfo-backend:' + release
        with tempfile.TemporaryDirectory(prefix='verify-', dir=self.base / 'incoming') as temp:
            with tarfile.open(source, 'r:') as archive:
                members = archive.getmembers()
                if len(members) != 2 or {m.name for m in members} != {'image.tar.gz', 'metadata.json'} or any(not m.isfile() for m in members):
                    raise DeploymentError('Invalid release bundle')
                meta_member = archive.getmember('metadata.json')
                if meta_member.size > 4096:
                    raise DeploymentError('Metadata exceeds size limit')
                meta = json.load(archive.extractfile(meta_member))
                if meta != {'commit': commit, 'release': release, 'image': expected}:
                    raise DeploymentError('Release metadata does not match requested commit')
                image = Path(temp) / 'image.tar.gz'
                with image.open('xb') as handle:
                    shutil.copyfileobj(archive.extractfile('image.tar.gz'), handle)
            validate_image_archive(image, expected)
            # The tag is unique per commit/run/attempt; no existing app tag is overwritten.
            self.runner(['/usr/bin/docker', 'load', '--input', str(image)], timeout=240)
        info = json.loads(self.runner(['/usr/bin/docker', 'image', 'inspect', expected], timeout=20))[0]
        labels = info['Config'].get('Labels') or {}
        if labels.get('org.opencontainers.image.revision') != commit or labels.get('org.opencontainers.image.source') != SOURCE:
            raise DeploymentError('Image source/revision labels do not match this repository')
        if info['Os'] != 'linux' or info['Architecture'] != 'amd64':
            raise DeploymentError('VPS requires a linux/amd64 image')
        directory.mkdir(mode=0o700)
        shutil.copyfile(self.base / 'deployment' / 'compose.production.yml', directory / 'compose.production.yml')
        (directory / '.env.compose').write_text('RELEASE_TAG=' + release + '\n')
        os.chmod(directory / '.env.compose', 0o600)
        (directory / 'release.json').write_text(json.dumps({**meta, 'image_id': info['Id'], 'previous': str(previous)}, indent=2))
        self.compose(directory, 'config', '--quiet', timeout=30)
        audit = json.loads(self.compose(directory, 'run', '--rm', '--no-deps', '-T',
                                        'api', 'node', 'deploy/audit-database.mjs', timeout=60))
        self.check_migrations(audit, allow_migrations)
        if audit['pendingMigrations']:
            self.log('applying_reviewed_migrations', release=release, migrations=audit['pendingMigrations'])
            self.compose(directory, 'run', '--rm', '--no-deps', '-T', 'api', 'node',
                         'node_modules/prisma/build/index.js', 'migrate', 'deploy', timeout=240)
            # An automatic application rollback never reverses database migrations.
        self.activate(directory, previous)
        source.unlink(missing_ok=True)
        self.log('deployed_healthy', release=release, commit=commit, previous=previous.name)

    @staticmethod
    def check_migrations(audit, allow_migrations):
        if not audit.get('databaseAuthenticated') or not audit.get('strictCertificateVerification'):
            raise DeploymentError('Strict TLS database audit failed')
        if audit.get('checksumMismatches') or audit.get('unresolvedMigrations'):
            raise DeploymentError('Migration checksum mismatch or unresolved migration; no rollout attempted')
        if audit.get('pendingMigrations') and not allow_migrations:
            raise DeploymentError('Pending migrations: review SQL and backup, then manually dispatch with apply_migrations=true')

    def status(self):
        current = (self.base / 'current').resolve(strict=True)
        print(json.dumps({'current': current.name}), flush=True)
        print(self.compose(current, 'ps', timeout=30), flush=True)


def main():
    os.umask(0o077)
    if fcntl is None:
        raise DeploymentError('Controller execution requires Linux')
    if os.geteuid() != 0:
        raise DeploymentError('Controller must be invoked through its restricted sudo rule')
    args = sys.argv[1:]
    if args == ['status']:
        Deployment().status()
        return
    if len(args) not in (2, 3) or args[0] not in ('receive', 'deploy'):
        raise DeploymentError('Invalid command')
    validate_release(args[1])
    if args[0] == 'receive' and len(args) != 2:
        raise DeploymentError('Invalid receive command')
    if args[0] == 'deploy' and (len(args) != 3 or args[2] not in ('true', 'false')):
        raise DeploymentError('Invalid migration mode')
    with open('/run/lock/pginfo-ci.lock', 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise DeploymentError('Another PgInfo deployment operation is running')
        deployment = Deployment()
        if args[0] == 'receive':
            deployment.receive(args[1], sys.stdin.buffer)
        else:
            try:
                deployment.deploy(args[1], args[2] == 'true')
            except Exception:
                deployment.log('deployment_failed', release=args[1])
                raise


if __name__ == '__main__':
    try:
        main()
    except (DeploymentError, OSError, ValueError, KeyError, tarfile.TarError,
            subprocess.TimeoutExpired, json.JSONDecodeError) as error:
        message = str(error) if isinstance(error, DeploymentError) else type(error).__name__
        print('PgInfo deployment refused/failed: ' + message, file=sys.stderr)
        sys.exit(1)
