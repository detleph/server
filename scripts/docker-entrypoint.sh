# Entry point for docker

if ! test -f INITIALIZED; then
  # Migrate the database
  # TODO: Update to use prisma migrate
  npx prisma db push
  touch INITIALIZED
fi

# Start the server
node ./dist/app.js
