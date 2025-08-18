#!/bin/sh

# Navigate to the directory where .env.local resides (if not already there)
# This assumes your .env.local is in the same directory as the script, or you provide a full path.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ENV_FILE="${SCRIPT_DIR}/../.env.local"

# Check if the .env.local file exists
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment variables from $ENV_FILE"

    VARS_TO_LOAD="POSTGRES_URL_NON_POOLING"

    # Loop through the desired variables
    for var_name in $VARS_TO_LOAD; do
        # Use grep to find the line for this variable,
        # then cut to get the value, then export it.
        # This approach is generally safe for simple key=value pairs.
        # For values with spaces or complex characters, more robust parsing might be needed.
        # A safer (but more complex) way would be to parse the whole file once
        # and then pick from an associative array if Bash 4+ is guaranteed.
        var_line=$(grep "^${var_name}=" "$ENV_FILE") # Get the line like VAR=value
        if [[ -n "$var_line" ]]; then # If the variable was found
            # Use 'eval' carefully: it can be a security risk if $var_line contains arbitrary code.
            # However, for known .env files, it's typically fine.
            # Alternative: IFS='=' read -r key val <<< "$var_line" && export "$key=$val"
            eval "export $var_line"
            echo "  Loaded: $var_name"
        else
            echo "  Warning: Variable '$var_name' not found in $ENV_FILE."
        fi
    done

    echo "Environment variables loaded."
else
    echo "Warning: .env.local not found at $ENV_FILE. Proceeding without it."
fi

pg_dump $POSTGRES_URL_NON_POOLING --disable-triggers > $1
