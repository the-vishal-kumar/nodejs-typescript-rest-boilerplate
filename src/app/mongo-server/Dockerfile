# Use a MongoDB base image
FROM mongo:6

# Set working directory
WORKDIR /data/db

# Expose port
EXPOSE 27017

# Start the server
CMD ["mongod", "--bind_ip_all"]