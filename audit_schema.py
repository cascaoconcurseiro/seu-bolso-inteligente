import re
import json
import glob

def parse_types():
    with open('src/integrations/supabase/types.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    schema = {}
    
    # Split by 'Row: {'
    chunks = content.split('Row: {')
    # chunks[0] is everything before the first Row: {
    # chunk[1] is the body of the first table's Row, plus stuff until the next Row: {
    # To find the table name, look at the text immediately preceding 'Row: {'
    for i in range(1, len(chunks)):
        prev_chunk = chunks[i-1]
        # find the last word before 'Row: {'
        match = re.search(r'([a-zA-Z0-9_]+)\s*:\s*\{\s*$', prev_chunk)
        if not match: continue
        table_name = match.group(1)
        schema[table_name] = []
        
        # Now parse lines in chunks[i] until '}'
        lines = chunks[i].split('\n')
        for line in lines:
            line = line.strip()
            if line == '}':
                break
            m_col = re.match(r'^([a-zA-Z0-9_]+)[?:]*\s*:', line)
            if m_col:
                schema[table_name].append(m_col.group(1))

    return schema

schema = parse_types()
print("Tables:", list(schema.keys()))

print("Transactions columns:", schema.get('transactions', []))

# check sql files
sql_files = glob.glob('supabase/migrations/*.sql') + glob.glob('supabase/*.sql')
for file in sql_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        for table, cols in schema.items():
            # Check for common mistakes: is_active, deleted, deleted_at, account_id
            for suspect in ['is_active', 'deleted', 'deleted_at', 'account_id']:
                if suspect not in cols:
                    # check if table and suspect appear together
                    # We can look for `UPDATE <table> SET <suspect>`
                    # or `FROM <table> WHERE <suspect>`
                    # It's a bit hard with regex, let's just do a heuristic
                    if table in content and suspect in content:
                        # Check if it's actually `table.suspect` or `suspect = ...` near `table`
                        pass

# A better check: parse RPC functions and find missing columns.
# For now, let's just see transactions columns
