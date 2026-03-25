const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
if (!schema.includes('allowedModels')) {
  fs.writeFileSync('prisma/schema.prisma', schema.replace(
    'anthropicKey    String?',
    'anthropicKey    String?\n  allowedModels   String?  // JSON array of strings\n  modelPricing    String?  // JSON object defining price per token'
  ));
  console.log('Schema patched');
}
