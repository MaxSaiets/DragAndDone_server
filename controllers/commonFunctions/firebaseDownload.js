const sharp = require('sharp');
const fs = require('fs').promises; // Використовуйте проміси для fs
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { bucket } = require('../../firebase');

async function uploadImage(filePath, imgType) {
  const uniqueName = `${uuidv4()}-${path.basename(filePath)}`;
  const paths = imagePaths(imgType);
  const results = [];

  async function uploadSingleImage(fileBuffer, imgPath, imgType) {
    const file = bucket.file(`${imgPath}${uniqueName}`);
    let compressedBuffer = fileBuffer;
    let quality = getQuality(imgType);

    const options = {
      quality: Math.round(quality), // Переконайтеся, що quality є цілим числом
      width: getMaxWidthOrHeight(imgType),
      withoutEnlargement: true,
    };

    try {
      let initialSizeMB = fileBuffer.length / 1024 / 1024; // Початковий розмір файлу в МБ

      if (imgType === 'productImgBig') {
        const maxSizeMB = 2;
        const minSizeMB = 1.5;

        if (initialSizeMB > maxSizeMB) {
          while (initialSizeMB > maxSizeMB && quality > 1) {
            compressedBuffer = await sharp(fileBuffer)
              .resize(options)
              .jpeg({ quality: Math.round(quality) })
              .toBuffer();
            initialSizeMB = compressedBuffer.length / 1024 / 1024;
            quality -= 5; // Зменшення якості на 5 одиниць
          }

          if (initialSizeMB < minSizeMB) {
            compressedBuffer = await sharp(fileBuffer)
              .resize(options)
              .jpeg({ quality: 100 })
              .toBuffer();
          }
        } else if (initialSizeMB < minSizeMB) {
          return uploadToFirebase(fileBuffer, file);
        }
      } else {
        compressedBuffer = await sharp(fileBuffer)
          .resize(options)
          .jpeg({ quality: Math.round(quality) })
          .toBuffer();
      }

      return uploadToFirebase(compressedBuffer, file);
    } catch (error) {
      console.error('Помилка під час компресії зображення:', error);
      throw error;
    }
  }

  function uploadToFirebase(fileBuffer, file) {
    return new Promise((resolve, reject) => {
      const writeStream = file.createWriteStream({
        metadata: {
          contentType: 'image/jpeg',
        },
      });

      writeStream.on('finish', async () => {
        try {
          const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
          resolve({ name: uniqueName, url });
        } catch (error) {
          reject(error);
        }
      });

      writeStream.on('error', (error) => {
        reject(error);
      });

      writeStream.end(fileBuffer);
    });
  }

  try {
    const fileBuffer = await fs.readFile(filePath); // Використовуйте проміси для fs

    if (imgType === 'productPreviewImg') {
      results.push(await uploadSingleImage(fileBuffer, paths.preview, 'productPreviewImg'));
      results.push(await uploadSingleImage(fileBuffer, paths.bigPreview, 'productImg'));
      results.push(await uploadSingleImage(fileBuffer, paths.big, 'productImgBig'));
    } else if (imgType === 'productImg') {
      results.push(await uploadSingleImage(fileBuffer, paths.preview, 'productImg'));
      results.push(await uploadSingleImage(fileBuffer, paths.big, 'productImgBig'));
    } else {
      results.push(await uploadSingleImage(fileBuffer, paths, imgType));
    }

    return results;
  } catch (error) {
    console.error('Помилка при читанні файлу:', error);
    throw error;
  }
}

function imagePaths(imgType) {
  const paths = {
    categoryImg: 'categories/',
    subCategoriesImg: 'subCategories/',
    productPreviewImg: {
      preview: 'products/previews/',
      bigPreview: 'products/bigPreviews/',
      big: 'products/big/',
    },
    productImg: {
      preview: 'products/bigPreviews/',
      big: 'products/big/',
    },
  };

  return paths[imgType] || '';
}

function getQuality(imgType) {
  const qualities = {
    categoryImg: 70, // Якість в діапазоні 1-100
    subCategoriesImg: 70,
    productPreviewImg: 90,
    productImg: 90,
    productImgBig: 100,
  };

  return qualities[imgType] || 70; // Значення за замовчуванням
}

function getMaxWidthOrHeight(imgType) {
  const sizes = {
    categoryImg: 30,
    subCategoriesImg: 400,
    productImg: 500,
    productPreviewImg: 200,
    productImgBig: undefined, // Не обмежуємо розміри для productImgBig
  };

  return sizes[imgType] || 300; // Значення за замовчуванням
}

async function deleteImage(filePath) {
  const file = bucket.file(filePath);

  try {
    await file.delete();
    console.log('Зображення успішно видалено');
  } catch (error) {
    console.error('Помилка під час видалення зображення:', error);
  }
}

module.exports = {
  uploadImage,
  deleteImage,
};