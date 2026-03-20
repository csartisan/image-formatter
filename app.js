(() => {
	const dropView = document.getElementById("drop-view");
	const cropView = document.getElementById("crop-view");
	const dropZone = document.getElementById("drop-zone");
	const fileInput = document.getElementById("file-input");
	const browseBtn = document.getElementById("browse-btn");
	const cropImage = document.getElementById("crop-image");
	const queueLabel = document.getElementById("queue-label");
	const filenameLabel = document.getElementById("filename-label");
	const exportBtn = document.getElementById("export-btn");
	const skipBtn = document.getElementById("skip-btn");

	let queue = [];
	let currentIndex = 0;
	let cropper = null;

	function formatFilename(originalName) {
		const base = originalName.replace(/\.[^.]+$/, "");
		return (
			base
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "") + ".jpg"
		);
	}

	function isHeic(file) {
		if (file.type === "image/heic" || file.type === "image/heif") return true;
		const ext = file.name.split(".").pop().toLowerCase();
		return ext === "heic" || ext === "heif";
	}

	function isImage(file) {
		if (file.type === "image/png" || file.type === "image/jpeg") return true;
		return isHeic(file);
	}

	function loadFiles(files) {
		const valid = Array.from(files).filter(isImage);
		if (!valid.length) return;
		queue = valid;
		currentIndex = 0;
		showCropView();
	}

	// Try native decode (Safari supports HEIC via ImageIO; also works for any
	// browser-supported format). Requires the page to be served over HTTP(S).
	function tryNativeDecode(file) {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				canvas.getContext("2d").drawImage(img, 0, 0);
				URL.revokeObjectURL(url);
				canvas.toBlob(
					(blob) => (blob ? resolve(blob) : reject()),
					"image/jpeg",
					1,
				);
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject();
			};
			img.src = url;
		});
	}

	// WASM fallback via libheif-js for Chrome (may not support all HEIC variants)
	function decodeHeicWasm(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const lib = libheif();
					const decoder = new lib.HeifDecoder();
					const data = decoder.decode(new Uint8Array(e.target.result));
					if (!data || !data.length) {
						reject(new Error("No images"));
						return;
					}
					const image = data[0];
					const width = image.get_width();
					const height = image.get_height();
					const canvas = document.createElement("canvas");
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d");
					const imageData = ctx.createImageData(width, height);
					image.display(imageData, (result) => {
						if (!result) {
							reject(new Error("Display failed"));
							return;
						}
						ctx.putImageData(result, 0, 0);
						canvas.toBlob(resolve, "image/jpeg", 1);
					});
				} catch (err) {
					reject(err);
				}
			};
			reader.onerror = reject;
			reader.readAsArrayBuffer(file);
		});
	}

	function showCropView() {
		const file = queue[currentIndex];

		queueLabel.textContent = `Image ${currentIndex + 1} of ${queue.length}`;
		filenameLabel.textContent = formatFilename(file.name);

		dropView.hidden = true;
		cropView.hidden = false;

		if (cropper) {
			cropper.destroy();
			cropper = null;
		}

		const loadBlob = (blob) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				cropImage.src = e.target.result;
				cropImage.onload = () => {
					cropper = new Cropper(cropImage, {
						aspectRatio: 4 / 3,
						viewMode: 1,
						autoCropArea: 1,
						movable: true,
						zoomable: false,
						rotatable: false,
						scalable: false,
					});
				};
			};
			reader.readAsDataURL(blob);
		};

		if (isHeic(file)) {
			tryNativeDecode(file)
				.catch(() => decodeHeicWasm(file))
				.then(loadBlob)
				.catch(() => {
					alert(
						`Could not decode "${file.name}". This is likely due to it being a photo from a newer iPhone, which clogs it's image data purposefully for maximum bugginess.\n\nFor HEIC support, open this page in Safari on macOS. Otherwise please upload a different file.`,
					);
					advance();
				});
		} else {
			loadBlob(file);
		}
	}

	function advance() {
		currentIndex++;
		if (currentIndex < queue.length) {
			showCropView();
		} else {
			finish();
		}
	}

	function finish() {
		if (cropper) {
			cropper.destroy();
			cropper = null;
		}
		cropImage.src = "";
		queue = [];
		currentIndex = 0;
		cropView.hidden = true;
		dropView.hidden = false;
	}
	function exportCurrent() {
		if (!cropper) return;
		const filename = formatFilename(queue[currentIndex].name);
		const canvas = cropper.getCroppedCanvas();
		const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
		const a = document.createElement("a");
		a.href = dataUrl;
		a.download = filename;
		a.click();
		advance();
	}

	exportBtn.addEventListener("click", exportCurrent);
	skipBtn.addEventListener("click", advance);

	browseBtn.addEventListener("click", () => fileInput.click());
	dropZone.addEventListener("click", (e) => {
		if (e.target !== browseBtn) fileInput.click();
	});

	fileInput.addEventListener("change", () => {
		loadFiles(fileInput.files);
		fileInput.value = "";
	});

	document.addEventListener("dragover", (e) => {
		e.preventDefault();
		dropZone.classList.add("drag-over");
	});

	document.addEventListener("dragleave", (e) => {
		if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
			dropZone.classList.remove("drag-over");
		}
	});

	document.addEventListener("drop", (e) => {
		e.preventDefault();
		dropZone.classList.remove("drag-over");
		if (!cropView.hidden) return;
		loadFiles(e.dataTransfer.files);
	});
})();
