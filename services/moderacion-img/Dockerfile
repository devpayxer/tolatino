# Moderación de imágenes propia (services/moderacion-img/app.py). Todo se baja al construir (PyPI); en uso no sale a internet.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PUERTO=8790
RUN useradd --system --uid 10001 moderacion
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
USER moderacion
EXPOSE 8790
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8790/salud', timeout=4).status == 200 else 1)"
CMD ["python", "app.py"]
