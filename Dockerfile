FROM node:20-alpine
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate
RUN pnpm run build
CMD ["pnpm", "run", "start"] 