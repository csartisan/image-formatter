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
			heic2any({ blob: file, toType: "image/jpeg", quality: 1 })
				.then(loadBlob)
				.catch(() => {
					alert(
						`Could not decode "${file.name}".\n\nHEIC/HEIF conversion requires the page to be served over HTTP — it won't work when opened directly as a file://. Try GitHub Pages or run a local server:\n\n  python3 -m http.server`,
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
