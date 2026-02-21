# Use Python 3.11 slim image
FROM python:3.11-slim

# Install minimal system dependencies for dlib and OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install dlib with single-threaded build to avoid OOM on free tier
ENV CMAKE_BUILD_PARALLEL_LEVEL=1
RUN pip install --no-cache-dir dlib==19.24.6

# Copy requirements and install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY src/ ./src/
COPY res/ ./res/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "src/api.py"]
