FROM node:20-alpine AS base
# --------------------- 依赖安装阶段 ---------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
# --------------------- 构建应用阶段 ---------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# --------------------- 生产应用阶段 ---------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# 设置正确的权限
RUN adduser --system --uid 1001 nextjs
RUN addgroup --system --gid 1001 nodejs
RUN mkdir .next
RUN chown nextjs:nodejs .next
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
CMD ["node", "server.js"] 
