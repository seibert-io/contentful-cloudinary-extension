import { init, FieldExtensionSDK, DialogExtensionSDK } from 'contentful-ui-extensions-sdk';

declare const cloudinary: any;

interface Asset {
	resource_type: string;
	type: string;
	public_id: string;
}

interface InstallationParameters {
	cloudName: string;
	apiKey: string;
	extensionId: string;
}

interface ModalInvocationParameters {
	fieldValue: Asset | null;
}

function initFieldExtension(extension: FieldExtensionSDK) {
	extension.window.startAutoResizer();

	const installationParameters = extension.parameters.installation as InstallationParameters;

	(document.querySelector('#dialog') as HTMLElement).style.display = 'none';

	const previewPane = document.querySelector('#preview') as HTMLElement;
	const createButton = document.querySelector('#create-btn') as HTMLElement;
	const editButton = document.querySelector('#edit-btn') as HTMLElement;
	const deleteButton = document.querySelector('#delete-btn') as HTMLElement;

	function updateFieldContent(): void {
		const asset: Asset | null = extension.field.getValue();
		const container = document.querySelector('#asset') as HTMLElement;
		container.innerHTML = '';

		if (asset) {
			const img: HTMLImageElement = document.createElement('img');
			img.src = `https://res.cloudinary.com/${installationParameters.cloudName}/image/${asset.type}/h_250/${asset.public_id}`;
			img.height = 250;
			img.addEventListener('click', openModal);
			container.appendChild(img);
			extension.window.updateHeight();
		}

		previewPane.style.display = asset ? 'flex' : 'none';
		deleteButton.style.display = asset ? 'inline' : 'none';
		createButton.style.display = asset ? 'none' : 'inline';
	}

	async function clearField() {
		const confirmed = await extension.dialogs.openConfirm({
			title: 'Remove this asset?',
			message: ' The asset will be removed from this entry, but still exist in the Cloudinary library.',
			intent: 'negative',
			confirmLabel: 'Yes',
			cancelLabel: 'No',
		});

		if (!confirmed) return;

		extension.field.setValue(null);
		updateFieldContent();
	}

	async function openModal(parameters: any): Promise<void> {
		const asset = await extension.dialogs.openExtension({
			id: installationParameters.extensionId,
			width: 2400,
			title: 'Select Cloudinary Asset',
			parameters: {
				isModal: true,
				fieldValue: extension.field.getValue(),
			},
		});

		if (asset) {
			await extension.field.setValue(asset);
			updateFieldContent();
		}

	}
	updateFieldContent();

	createButton!.addEventListener('click', openModal);
	editButton!.addEventListener('click', openModal);
	deleteButton!.addEventListener('click', clearField);
}

function initDialogExtension(extension: DialogExtensionSDK) {
	const installationParameters = extension.parameters.installation as InstallationParameters;

	(document.querySelector('#field') as HTMLElement).style.display = 'none';
	(document.querySelector('#dialog') as HTMLElement)!.style.height = '700px';

	extension.window.startAutoResizer();

	const invocationParameters: ModalInvocationParameters = extension.parameters.invocation as ModalInvocationParameters;

	const asset = invocationParameters.fieldValue ? {
		resource_type: invocationParameters.fieldValue.resource_type,
		type: invocationParameters.fieldValue.type,
		public_id: invocationParameters.fieldValue.public_id,
	} : null;

	const options = {
		cloud_name: String(installationParameters.cloudName),
		api_key: String(installationParameters.apiKey),
		multiple: false,
		remove_header: true,
		inline_container: document.querySelector('#dialog'),
		asset,
	};

	function onAssetSelect(data: any): void {
		const selectedAsset: any = data.assets[0];
		extension.close(selectedAsset);

	}
	console.log(extension.parameters);

	cloudinary.openMediaLibrary(options, { insertHandler: onAssetSelect });
}



init(async extension => {
	if (extension.parameters.invocation) {
		initDialogExtension(extension as DialogExtensionSDK);
	} else {
		initFieldExtension(extension as FieldExtensionSDK);
	}
});
