# Use a Node.js base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json .

# Install dependencies
# RUN npm ci --only=production
RUN npm i

# Copy the rest of the application code to the container
COPY . .

# Build the TypeScript code
RUN npm run build

# Start the application
CMD [ "node", "build/index.js" ]
