# Use a LaTeX distribution image
FROM node:20-bookworm AS builder

# Install LaTeX
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-extra \
    latexmk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server.js
COPY server.js .

# Create temp directory for compilations
RUN mkdir -p /tmp/latex-compile

EXPOSE 3001

CMD ["node", "server.js"]
