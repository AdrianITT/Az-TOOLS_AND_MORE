import { useEffect, useRef, useState } from 'react'

let nextId = 0

export function usePdfFiles({ withPreview = false } = {}) {
  const [items, setItems] = useState([])
  const previewUrls = useRef(new Set())

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function addFiles(files) {
    const newItems = files.map((file) => {
      let previewUrl = null
      if (withPreview && file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file)
        previewUrls.current.add(previewUrl)
      }
      return { id: `f${nextId++}`, file, previewUrl }
    })
    setItems((prev) => [...prev, ...newItems])
  }

  function removeFile(id) {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
        previewUrls.current.delete(target.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  function moveFile(from, to) {
    setItems((prev) => {
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  function reset() {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
    previewUrls.current.clear()
    setItems([])
  }

  return { items, addFiles, removeFile, moveFile, reset }
}
