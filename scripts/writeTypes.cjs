const fs = require('fs');
const rawData = fs.readFileSync('/Users/herujohaeri/.gemini/antigravity/brain/fb863cc0-80b8-4d3c-bc51-fef74e9d39b3/.system_generated/steps/83/output.txt', 'utf8');

let typeText = rawData;
try {
    const parsed = JSON.parse(rawData);
    if (parsed.types) {
        typeText = parsed.types;
    }
} catch (e) {
    // Ignore
}

fs.mkdirSync('src/types', { recursive: true });
fs.writeFileSync('src/types/supabase.ts', typeText);
console.log('Successfully wrote src/types/supabase.ts');
