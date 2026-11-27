FROM mcr.microsoft.com/playwright:v1.56.1-noble
RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN npm install --no-audit --no-fund --save-exact playwright@1.56.1
RUN curl -fsSL https://api.github.com/meta -o /tmp/github-meta.json && node -e "const k=require('/tmp/github-meta.json').ssh_keys;if(!k?.length)throw Error('Sin claves públicas de GitHub');require('fs').writeFileSync('/app/github_known_hosts', k.map(x=>'github.com '+x).join('\n')+'\n')"
COPY operacion/vps/*.mjs /app/
COPY operacion/vps/campanas-revisadas.json /app/
RUN chmod 644 /app/*.mjs /app/campanas-revisadas.json
ENV GIT_SSH_COMMAND="ssh -i /run/fvr-auth/github -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/app/github_known_hosts"
USER pwuser
CMD ["node","/app/servidor.mjs"]
