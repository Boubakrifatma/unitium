# syntax=docker/dockerfile:1.4
# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy Maven wrapper and pom first (layer-cache dependencies)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x ./mvnw
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 ./mvnw package -DskipTests -B

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]
