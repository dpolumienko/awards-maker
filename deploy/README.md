# Deploying Awards Maker

Self-hosted, same shape as the streamawards stack: Nitro `node-server` in Docker
behind an nginx that something else on the box already owns.

## First time

1. `git clone` onto the server, `cp .env.example .env`, fill it in.
   `NUXT_SESSION_PASSWORD` must be 32+ characters - `openssl rand -hex 32`.
2. Register **two** redirect URIs on the Twitch application, because Twitch
   matches them exactly:
   - `https://<domain>/auth/twitch` - voters
   - `https://<domain>/auth/twitch-host` - hosts
3. `cp deploy/nginx/awards-maker.conf /etc/nginx/sites-available/` and symlink it
   into `sites-enabled`, then `nginx -t && systemctl reload nginx`.
   The app container must share a docker network nginx can reach.
4. `./deploy/deploy.sh main`

The schema is applied by the app itself on boot - there is no migration step to
forget. Two containers coming up together take a MySQL named lock, so only one
of them writes.

## After that

`./deploy/deploy.sh main`. It fetches, resets, rebuilds, brings the stack up and
polls `/healthz` for five minutes before giving up and printing the logs.

## Backups

Everything worth keeping is in the `db` volume and the `uploads` volume.

    docker exec awards-maker-db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" awards_maker > dump.sql
    docker run --rm -v awards-maker_uploads:/from -v "$PWD":/to alpine tar cz -C /from . -f /to/uploads.tgz
