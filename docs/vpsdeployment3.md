Open PowerShell and connect to the VPS:
ssh root@187.127.132.81
Enter your VPS password when prompted.
1. View the deployment folders:
   cd /opt/pginfo
   ls -la
   - current points to the active release.
   - releases contains previous releases.
   - shared contains production configuration and secrets.
   - deployment contains the CI/CD controller configuration.
2. Inspect the active release:
   cd /opt/pginfo/current
   pwd -P
   ls -la
   CI/CD releases contain configuration and release metadata. Application code runs inside the Docker image.
3. View release information and image configuration:
   cat release.json
   cat .env.compose
4. Check the production .env file:
   ls -l /opt/pginfo/shared/.env.production
   less /opt/pginfo/shared/.env.production
   Press q to exit. This displays real credentials—don’t share screenshots or paste its contents into chat.
   To display variable names only:
   cut -d= -f1 /opt/pginfo/shared/.env.production
5. Check running services:
   cd /opt/pginfo/current
   docker compose --env-file .env.compose -f compose.production.yml ps
If you later edit production variables, recreate the API and worker so they receive the new values; a simple container restart does not reload the environment file.