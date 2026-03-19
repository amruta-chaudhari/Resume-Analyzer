#!/bin/bash
# Quick script to build and run ATS Resume Analyzer Docker container

echo "🐳 ATS Resume Analyzer - Docker Deployment"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop or Docker daemon."
    exit 1
fi

echo "✅ Docker is running"

# Build the image
echo ""
echo "📦 Building Docker image..."
docker build -t ats-resume-analyzer:latest .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed. Check the error messages above."
    exit 1
fi

echo "✅ Docker image built successfully"

# Stop existing container if running
echo ""
echo "🛑 Stopping existing container (if any)..."
docker-compose down 2>/dev/null || true

# Run the container
echo ""
echo "🚀 Starting container..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start container"
    exit 1
fi

echo "✅ Container started!"
echo ""
echo "📊 Container Status:"
docker ps | grep ats-resume-analyzer

echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3000/api"
echo "   Health:   http://localhost:3000/health"

echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop:      docker-compose down"
echo ""
