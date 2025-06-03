# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder

# Install necessary system dependencies (if any, typically not for Next.js build)
# RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package.json and lock files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install ONLY production dependencies in the builder stage
# For Next.js, it's often simpler to install all dependencies here and prune later
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm install --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Copy the rest of the application code
COPY . .

# Build the Next.js application
# Next.js 13+ with App Router recommends `next build`
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine AS runner

# Install necessary system dependencies for runtime (if any)
# For Next.js, usually none besides what's in base Node image, but libc6-compat is common.
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Set environment variables for Next.js production
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME 0.0.0.0

# Copy necessary files from the builder stage
# For Next.js, we need:
# - .next folder (built application)
# - public folder (static assets)
# - package.json (for starting script and dependencies)
# - node_modules (production dependencies)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Ensure permissions are correct if running as a non-root user (good practice for prod)
# RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
# USER appuser

EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "start"]


# frontend/Dockerfile
# FROM node:24-alpine AS dev

# # ติดตั้ง dependencies พื้นฐานที่อาจต้องใช้
# RUN apk add --no-cache libc6-compat

# # ตั้ง working directory
# WORKDIR /app

# # คัดลอกไฟล์ dependency lock มา
# COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# # ติดตั้ง dependencies แบบ dev ด้วย
# RUN \
#   if [ -f yarn.lock ]; then yarn; \
#   elif [ -f package-lock.json ]; then npm install; \
#   elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm install; \
#   else echo "Lockfile not found." && exit 1; \
#   fi

# # คัดลอกโค้ดโปรเจกต์ (คุณสามารถข้ามขั้นตอนนี้ ถ้าคุณใช้ volume mount)
# COPY . .

# # เปิดพอร์ตสำหรับ dev server
# EXPOSE 3000

# # ตั้งค่าตัวแปรสำหรับ dev
# ENV NODE_ENV development
# ENV HOSTNAME 0.0.0.0
# ENV PORT 3000

# # ใช้ user ปกติ
# CMD ["npm", "run", "dev"]
# # หรือถ้าใช้ npm: CMD ["npm", "run", "dev"]
