# syntax=docker/dockerfile:1
# Amber & Pea Law API (Spring Boot 3.5, Java 17).
# Build from the repo root:  docker build -f api/Dockerfile -t amberpea-api .

# ---- Build: compile with the Maven Wrapper and extract Spring Boot layers ----
FROM eclipse-temurin:17.0.20_8-jdk-noble AS build
WORKDIR /workspace

# Wrapper and POM first so dependency downloads are cached separately from source changes.
COPY api/mvnw api/pom.xml ./
COPY api/.mvn .mvn
# Strip CRLF in case the repo was checked out on Windows with autocrlf.
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q dependency:go-offline

COPY api/src src
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q -DskipTests package \
 && java -Djarmode=tools -jar target/law-api-0.1.0.jar extract --layers --launcher --destination target/extracted

# ---- Runtime: JRE only, non-root, layered for fast rebuilds ----
FROM eclipse-temurin:17.0.20_8-jre-noble
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app --no-create-home app
WORKDIR /app

# Least-frequently-changing layers first.
COPY --from=build /workspace/target/extracted/dependencies/ ./
COPY --from=build /workspace/target/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/target/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/target/extracted/application/ ./

USER 10001:10001
EXPOSE 8080

# All configuration comes from environment variables (see api/.env.example).
# Container-aware heap sizing; exit on OOM so the orchestrator restarts the container.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"

# Probes: GET /actuator/health/liveness and /actuator/health/readiness
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
