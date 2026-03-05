const fs = require('fs');

function generateSql() {
    const dataPath = '/Users/herujohaeri/.gemini/antigravity/brain/fb863cc0-80b8-4d3c-bc51-fef74e9d39b3/.system_generated/steps/28/output.txt';
    if (!fs.existsSync(dataPath)) {
        console.error('Data path not found:', dataPath);
        return;
    }

    const rawData = fs.readFileSync(dataPath, 'utf8');
    let data;
    try {
        data = JSON.parse(rawData);
    } catch (e) {
        console.error('JSON parse error, trying to extract valid JSON part.');
        // Sometimes output contains logging like "Step Id: 28"
        const jsonStr = rawData.substring(rawData.indexOf('{'));
        data = JSON.parse(jsonStr);
    }

    let sql = '-- Supabase Schema Auto-Generated from MCP\n\n';

    if (data && data.tables) {
        data.tables.forEach(table => {
            sql += `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;
            if (table.columns && table.columns.length > 0) {
                const cols = table.columns.map(col => {
                    let colStr = `  ${col.name} ${col.data_type}`;
                    if (col.is_nullable === false) colStr += ' NOT NULL';
                    return colStr;
                });
                sql += cols.join(',\n');
            } else {
                sql += `  -- No columns found in MCP details`;
            }
            sql += `\n);\n\n`;
        });
    } else {
        sql += '-- No tables found\n';
    }

    fs.mkdirSync('database', { recursive: true });
    fs.writeFileSync('database/supabase.sql', sql);
    console.log('Successfully generated database/supabase.sql');
}

generateSql();
