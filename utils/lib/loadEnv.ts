import * as path from 'path';
import dotenv from 'dotenv';

// get environment variables

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });
