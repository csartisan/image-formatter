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

	function loadFiles(files) {
		const valid = Array.from(files).filter(
			(f) => f.type === "image/png" || f.type === "image/jpeg",
		);
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
		reader.readAsDataURL(file);
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
