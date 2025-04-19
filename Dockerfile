FROM node:20-alpine AS base

# --------------------- 依赖安装阶段 ---------------------
FROM base AS deps
WORKDIR /app

# 仅复制依赖管理文件以利用Docker缓存
COPY package.json package-lock.json ./

# 安装生产依赖（分离开发依赖以减小最终镜像体积）
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# --------------------- 构建阶段 ---------------------
FROM base AS builder
WORKDIR /app

# 安装构建所需的系统依赖（Alpine需要libc6-compat）
RUN apk add --no-cache libc6-compat

# 从deps阶段复制已安装的依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码（通过.dockerignore过滤无关文件）
COPY . .

# 构建应用
RUN npm run build

# --------------------- 生产环境阶段 ---------------------
FROM base AS runner
WORKDIR /app

# 设置生产环境变量（禁用Next.js遥测）
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 创建非root用户（遵循最小权限原则）
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p .next && \
    chown nextjs:nodejs .next

# 从构建阶段复制必要文件并设置权限
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换用户并暴露端口
USER nextjs
EXPOSE 3000

# 使用dumb-init处理Linux信号（避免僵尸进程）
RUN wget -O /usr/local/bin/dumb-init https://github.com/Yelp/dumb-init/releases/download/v1.2.5/dumb-init_1.2.5_x86_64 && \
    chmod +x /usr/local/bin/dumb-init

# 健康检查配置
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:3000 || exit 1

# 启动命令（exec格式避免僵尸进程）
ENTRYPOINT ["/usr/local/bin/dumb-init", "--"]
CMD ["node", "server.js"]
