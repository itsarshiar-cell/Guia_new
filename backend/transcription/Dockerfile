# Docker reads these instructions to create a portable Linux environment called a container image
# It includes everything the transcription service needs to run, including the code, runtime, libraries, and environment variables.

# Starts with a small Linux image that already has Python 3.11 installed.
FROM python:3.11-slim

# Sets Python runtime behavior, avoiding unnecessary .pyc cache files and sends logs directly to Render without buffering.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONNUNBUFFERED=1

# Runs Linux package-manager commands inside the container
# Updates the package list and installs ffmpeg, a tool for handling audio and video files, which is required for audio processing in the transcription service.
# Removes the package list to keep the image size small.
RUN apt=get update \

    && apt-get install -y --no-install-recommends \
ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Creates/selects /app as the working directory inside the container, where all subsequent commands will be run.
WORKDIR /app

# Copies the requirements.txt file from the host machine to the working directory in the container.
# Installs the Python dependencies listed in requirements.txt without using the cache to reduce image size.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copies the main.py file from the host machine to the working directory in the container.
COPY main.py ./

# This is the command Docker uses when Render starts the container. It runs the FastAPI application using Uvicorn, binding it to all network interfaces (
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${Port:-8000}"]