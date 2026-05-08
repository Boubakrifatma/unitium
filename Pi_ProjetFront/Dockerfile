# syntax=docker/dockerfile:1.4
# Stage 1: Build Angular
FROM node:22-alpine AS builder
WORKDIR /app

ENV NG_BUILD_DISABLE_FONT_INLINING=1

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source and build production bundle
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist/demo/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
