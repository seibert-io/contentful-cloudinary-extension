import { init, FieldExtensionSDK, DialogExtensionSDK } from 'contentful-ui-extensions-sdk';


declare const cloudinary: any;


interface Asset {
	resource_type: string;
	derived: Record<string, any>[];
	type: string;
	public_id: string;
}


interface InstallationParameters {
	cloudName: string;
	apiKey: string;
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

			if (asset.resource_type === 'image') {
				if (asset.derived && asset.derived.length > 0) {
					img.src = asset.derived[0].secure_url;
				} else {
					img.src = `https://res.cloudinary.com/${installationParameters.cloudName}/image/${asset.type}/h_250/${asset.public_id}`;
				}
				img.title = `Image: ${asset.public_id}`
			} else if (asset.resource_type === 'video') {
				img.src = `https://res.cloudinary.com/${installationParameters.cloudName}/video/${asset.type}/so_auto,h_250/${asset.public_id}.jpg`;
				img.title = `Video: ${asset.public_id}`
			}
			//img.style.maxHeight = '250px';
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
			id: extension.ids.extension,
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
	const fieldValue: Asset | null = invocationParameters.fieldValue;

	const showConfig: Record<string, any> = { };

	const mediaLibaryOptions = {
		cloud_name: String(installationParameters.cloudName),
		api_key: String(installationParameters.apiKey),
		multiple: false,
		remove_header: true,
		inline_container: document.querySelector('#dialog'),
	};

	function onAssetSelect(data: any): void {
		const selectedAsset: any = data.assets[0];
		console.log('Asset selected:', selectedAsset);
		extension.close(selectedAsset);
	}
	
	const mediaLibrary = cloudinary.createMediaLibrary(mediaLibaryOptions, { insertHandler: onAssetSelect });

	
	if (fieldValue && fieldValue.derived && fieldValue.derived.length > 0) {
		showConfig.transformation = {
			url: fieldValue.derived[0].secure_url
		};
	} else if (fieldValue) {
		showConfig.asset = {
			resource_id: `${fieldValue.resource_type}/${fieldValue.type}/${fieldValue.public_id}`,
		};
	}

	console.log('Show Media Library');
	console.log('Options:', mediaLibaryOptions);
	console.log('ShowConfig:', showConfig);

	mediaLibrary.show(showConfig);
}


init(async extension => {
	if (extension.parameters.invocation) {
		initDialogExtension(extension as DialogExtensionSDK);
	} else {
		initFieldExtension(extension as FieldExtensionSDK);
	}
});
