FROM python:3.9

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Create the appropriate directories
WORKDIR /usr/src/app

# Create a user and group named 'django'
RUN groupadd --gid 1000 django \
    && useradd --uid 1000 --gid 1000 -m django
# Install dependencies
COPY requirements.txt /usr/src/app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /usr/src/app/

# Add the frontend directory as an environment variable
ENV FRONTEND_FOLDER=/usr/src/app/frontend
