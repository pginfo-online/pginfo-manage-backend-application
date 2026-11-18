#!/usr/bin/python3 -I
"""Forced SSH command: no shell, SFTP, forwarding, or arbitrary sudo access."""
import os
import re
import subprocess
import sys

RELEASE = r'[a-f0-9]{40}-[0-9]{1,20}-[0-9]{1,5}'


def arguments(command):
    if command == 'status':
        return ['status']
    if re.fullmatch(r'receive ' + RELEASE, command):
        return command.split(' ')
    if re.fullmatch(r'deploy ' + RELEASE + r' (true|false)', command):
        return command.split(' ')
    raise ValueError('Only validated PgInfo deployment commands are allowed')


if __name__ == '__main__':
    try:
        args = arguments(os.environ.get('SSH_ORIGINAL_COMMAND', ''))
        sys.exit(subprocess.call(['/usr/bin/sudo', '-n', '/usr/local/sbin/pginfo-ci'] + args))
    except ValueError as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
