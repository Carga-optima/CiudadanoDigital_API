# single-stage Dockerfile (build + runtime)
FROM node:20-bullseye-slim

# Metadata (opcional)
LABEL maintainer="tu@correo" \
      description="Imagen combinada: node + python venv + tesseract"

# Evitar prompts y preparar apt
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /usr/src/app

# 1) Instalar herramientas build + runtime necesarias
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    ca-certificates \
    git \
    tesseract-ocr \
    libtesseract-dev \
 && rm -rf /var/lib/apt/lists/*

# 2) Copiar ficheros que benefician cache (requirements + package.json)
COPY requirements.txt ./
COPY package*.json ./

# 3) Preparar wheels Python (si hay requirements) y node modules
RUN python3 -m pip install --upgrade pip setuptools wheel

RUN python3 -m pip wheel --wheel-dir=/wheels -r requirements.txt

RUN npm install --no-audit --no-fund

# 4) Crear venv e instalar las wheels (si existen)
RUN python3 -m venv ciudadano_digital
RUN ./ciudadano_digital/bin/python -m pip install --upgrade pip setuptools
RUN if [ -d /wheels ]; then ./ciudadano_digital/bin/pip install --no-index --find-links=/wheels -r /usr/src/app/requirements.txt; fi

# 5) Copiar el resto de la aplicación
COPY . .

# 5.1) Crear directorio de logs con permisos de escritura
RUN mkdir -p /usr/src/app/logs && chmod 755 /usr/src/app/logs

# 6) Limpiar artefactos temporales y purgar dependencias de build para reducir tamaño
RUN rm -rf /wheels || true \
 && apt-get purge -y build-essential python3-dev git \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* /tmp/*

# Variables de entorno para usar el venv
ENV PATH="/usr/src/app/ciudadano_digital/bin:$PATH"
ENV PYTHON_BIN="/usr/src/app/ciudadano_digital/bin/python"

# Debug (opcional — puedes quitarlo en producción)
RUN echo "---- Debug: tesseract & python ----" \
 && tesseract --version || true \
 && $PYTHON_BIN -m pip freeze || true \
 && echo "---- Debug: venv location ----" \
 && ls -la /usr/src/app/ciudadano_digital

EXPOSE 3000

COPY entrypoint.sh ./
CMD ["./entrypoint.sh"]
