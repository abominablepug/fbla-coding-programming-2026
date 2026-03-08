from app.__init__ import create_app
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create the Flask application instance using the factory pattern
app = create_app()

if __name__ == "__main__":
    # Get port from environment or use default 5174
    port = int(os.getenv('BACKEND_PORT', 5174))
    
    # Start the development server
    # host='0.0.0.0' allows external connections (needed for Docker/network access)
    # debug=True enables auto-reload and detailed error pages
    app.run(host='0.0.0.0', port=port, debug=True)
