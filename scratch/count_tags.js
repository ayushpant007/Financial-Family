const fs = require('fs');

function countTags(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const tags = ['div', 'Dialog', 'Layout', 'Card', 'Badge', 'Select', 'Button', 'Label', 'Input', 'CardContent', 'CardHeader', 'CardTitle', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogFooter', 'SelectContent', 'SelectTrigger', 'SelectValue', 'SelectItem'];
    
    console.log(`File: ${filePath}`);
    tags.forEach(tag => {
        const open = (content.match(new RegExp(`<${tag}( |>|$)`, 'g')) || []).length;
        const close = (content.match(new RegExp(`</${tag}>`, 'g')) || []).length;
        if (open !== close) {
            console.log(`${tag}: OPEN=${open} | CLOSE=${close} <--- MISMATCH`);
        } else {
            // console.log(`${tag}: ${open}`);
        }
    });
    console.log('---');
}

countTags('artifacts/wealth-mgmt/src/pages/client/dashboard.tsx');
countTags('artifacts/wealth-mgmt/src/pages/client/family-tree.tsx');
