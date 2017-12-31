const fileInput = document.createElement('input')
fileInput.id = 'input'
fileInput.type = 'file'
fileInput.style.display = 'none'

const fileLabel = document.createElement('label')
fileLabel.innerText = 'Load image'
fileLabel.className = 'button'

const downloadButton = document.createElement('button')
downloadButton.className = 'button'
downloadButton.innerText = 'Download'
downloadButton.disabled = true

const fileBlock = document.createElement('div')
fileBlock.id = 'block'

const drawCanvas = document.createElement('canvas')
const baseCanvas = document.createElement('canvas')

let canvasWidth
let canvasHeight

function updateSizes (width, height) {
  canvasWidth = drawCanvas.width = baseCanvas.width = width
  canvasHeight = drawCanvas.height = baseCanvas.height = height
}

const baseContext = baseCanvas.getContext('2d')
const drawContext = drawCanvas.getContext('2d')

fileLabel.appendChild(fileInput)
fileBlock.appendChild(fileLabel)
fileBlock.appendChild(downloadButton)

const container = document.body
container.appendChild(fileBlock)
container.appendChild(baseCanvas)
container.appendChild(drawCanvas)

function getFileUrl (file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader()
    reader.addEventListener(
      'load',
      function () {
        resolve(reader.result)
      },
      false
    )
    reader.addEventListener(
      'error',
      function () {
        reject(reader.error)
      },
      false
    )
    reader.readAsDataURL(file)
  })
}

function getLoadedImage (url) {
  const image = new Image(url)
  return new Promise((resolve, reject) => {
    image.src = url
    image.onload = () => resolve(image)
    image.onerror = error => reject(error)
  })
}

function isSimilar (data, a, b) {
  const threshold = 3
  return (
    Math.abs(data[a] - data[b]) < threshold &&
    Math.abs(data[a + 1] - data[b + 1]) < threshold &&
    Math.abs(data[a + 2] - data[b + 2]) < threshold &&
    Math.abs(data[a + 3] - data[b + 3]) < threshold
  )
}

function averageSimilarNeighbors (imageData, hits, i, color, set) {
  if (hits[i] !== 0) return
  hits[i] = 1
  set.push(i)

  const { data, width } = imageData
  const indexSize = data.length
  const indexWidth = width * 4

  if (!color.length) {
    color.push(data[i], data[i + 1], data[i + 2], data[i + 3])
  } else {
    const minor = 1 / set.length
    const major = 1 - minor
    color[0] = color[0] / major + data[i] / minor
    color[1] = color[1] / major + data[i + 1] / minor
    color[2] = color[2] / major + data[i + 2] / minor
    color[3] = color[3] / major + data[i + 3] / minor
  }

  const isTopMost = Math.floor(i / indexWidth) === 0
  const isLeftMost = i % indexWidth === 0
  const isRightMost = (i + 4) % indexWidth === 0
  const isBottomMost = i + indexWidth < indexSize

  if (!isTopMost && isSimilar(data, i, i - indexWidth)) {
    averageSimilarNeighbors(imageData, hits, i - indexWidth, color, set)
  }

  if (!isLeftMost && isSimilar(data, i, i - 4)) {
    averageSimilarNeighbors(imageData, hits, i - 4, color, set)
  }

  if (!isRightMost && isSimilar(data, i, i + 4)) {
    averageSimilarNeighbors(imageData, hits, i + 4, color, set)
  }

  if (!isBottomMost && isSimilar(data, i, i + indexWidth)) {
    averageSimilarNeighbors(imageData, hits, i + indexWidth, color, set)
  }
}

function processImageData (imageData) {
  const data = imageData.data
  const size = data.length
  const hits = new Uint8ClampedArray(size)
  const newData = new Uint8ClampedArray(size)
  for (var i = 0; i < size; i += 4) {
    if (hits[i] !== 0) continue
    const set = []
    const color = []
    averageSimilarNeighbors(imageData, hits, i, color, set)
    const [r, g, b, a] = color
    const setSize = set.length
    for (let j = 0; j < setSize; j++) {
      const p = set[j]
      newData[p] = r
      newData[p + 1] = g
      newData[p + 2] = b
      newData[p + 3] = a
    }
  }
  return newData
}

fileInput.addEventListener('change', async function () {
  const file = fileInput.files && fileInput.files[0]
  if (!file) {
    return
  }

  const url = await getFileUrl(file)
  const image = await getLoadedImage(url)

  updateSizes(image.naturalWidth, image.naturalHeight)

  baseContext.drawImage(image, 0, 0, canvasWidth, canvasHeight)

  setTimeout(() => {
    const imageData = baseContext.getImageData(0, 0, canvasWidth, canvasHeight)
    const newData = processImageData(imageData)
    const newImageData = new ImageData(
      newData,
      imageData.width,
      imageData.height
    )
    drawContext.putImageData(newImageData, 0, 0)

    const url = drawCanvas.toDataURL(file.type)
    downloadButton.disabled = false
    downloadButton.onclick = function () {
      document.write("<img src='" + url + "'/>")
    }
  }, 0)
})
