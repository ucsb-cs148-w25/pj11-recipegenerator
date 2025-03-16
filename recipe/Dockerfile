FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Export the web version of the app (this is the correct command for Expo)
RUN npx expo export:web

# Use a lightweight web server to serve the static files
FROM nginx:alpine

# Copy the built files from the previous stage
COPY --from=0 /app/web-build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"] 