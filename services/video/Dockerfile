# Video de presentación (C-001): servicio propio con ffmpeg (services/video/app.py). Sin dependencias de PyPI; en uso no sale a internet.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PUERTO=8791
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/* && useradd --system --uid 10002 video
WORKDIR /srv
COPY app.py .
USER video
EXPOSE 8791
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8791/salud', timeout=4).status == 200 else 1)"
CMD ["python", "app.py"]
