# Utiliser une image Node.js légère
FROM node:20-alpine

# Définir le dossier de travail dans le conteneur
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers du projet (le code source)
COPY . .

# Exposer le port utilisé par Vite
EXPOSE 5173

# Lancer le serveur de développement
CMD ["npm", "run", "dev"]