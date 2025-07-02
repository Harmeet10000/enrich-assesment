# The Docker container is built using the Dockerfile in the project directory.
docker build -t api-service -f docker/dev/Dockerfile .

# Run the Docker container for the Shiksha Dost Backend
docker run -d \
  -p 8000:8000 \
  --name api-service-container-dev \
  --env-file .env.dev \
  api-service:latest

# View the logs of the Docker container
docker logs -f api-service-container

# tag the docker image - DockerHub
docker tag api-service harmeet10000/api-service:latest
# for AWS ECR tag your image so you can push the image to this repository:
docker tag api-service:latest 050752605875.dkr.ecr.ap-south-1.amazonaws.com/api-service:latest

# push the docker image to docker hub
docker push harmeet10000/api-service:latest
# for AWS ECR push the image to this repository:
docker push
