'use strict';
// Le skill vit dans le dépôt du builder (#197) : le checkout testé est ce dépôt, sauf BUILDER explicite.
const path = require('node:path');
module.exports = {root: process.env.BUILDER || path.resolve(__dirname, '../../../..')};
