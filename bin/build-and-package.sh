#!/bin/bash

# Build and package script for frontend deployment
# Creates output folder with production-ready build

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/output"

APP_NAME="smileyan-frontend"

echo "Building $APP_NAME for production..."

cd "$PROJECT_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Build for production
echo "Building..."
npm run build:prod

# Create deployment package
mkdir -p "$OUTPUT_DIR/$APP_NAME"
cp -r dist/* "$OUTPUT_DIR/$APP_NAME/"

# Create install script
cat > "$OUTPUT_DIR/$APP_NAME/install.sh" << 'INSTEOF'
#!/bin/bash
set -e

DEPLOY_DIR="/var/www/html"

echo "Installing Smileyan Frontend to $DEPLOY_DIR..."

# Clear existing files
echo "Clearing existing files in $DEPLOY_DIR..."
sudo rm -rf "$DEPLOY_DIR"/*

# Create directory
sudo mkdir -p "$DEPLOY_DIR"

# Copy files
echo "Copying frontend files..."
sudo cp -r . "$DEPLOY_DIR/"

echo "Installation complete!"
INSTEOF
chmod +x "$OUTPUT_DIR/$APP_NAME/install.sh"

# Create tar.gz package
cd "$OUTPUT_DIR"
tar --no-xattr -czvf "${APP_NAME}.tar.gz" "$APP_NAME"
rm -rf "$APP_NAME"

echo ""
echo "Build complete!"
echo "Output: $OUTPUT_DIR/${APP_NAME}.tar.gz"
echo ""
echo "Package contents:"
tar -tzvf "${APP_NAME}.tar.gz" | head -20
echo "..."
echo ""
echo "To deploy:"
echo "  1. Copy to server: scp ${APP_NAME}.tar.gz user@server:/tmp/"
echo "  2. Extract: cd /tmp && tar -xzvf ${APP_NAME}.tar.gz"
echo "  3. Run: cd ${APP_NAME} && ./install.sh"