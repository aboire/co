/* eslint-disable no-prototype-builtins */
/* eslint-disable consistent-return */
/* eslint-disable import/prefer-default-export */
import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
// import { request } from 'meteor/froatsnook:request';
import FormData from 'form-data';
import { fetch } from 'meteor/fetch';


export const apiCommunecter = {};

const callPixelRest = (token, method, controller, action, post) => {
  // post['X-Auth-Token'] = token;
  // post['X-User-Id'] = Meteor.userId();
  // post['json'] = 1;
  // console.log(post);
  const responsePost = HTTP.call(method, `${Meteor.settings.endpoint}/${controller}/${action}`, {
    headers: {
      'X-Auth-Token': token,
      'X-User-Id': Meteor.userId(),
      'X-Auth-Name': 'comobi',
      // Origin: 'https://co-mobile.communecter.org',
    },
    params: post,
    npmRequestOptions: {
      jar: true,
    },
  });
    // console.log(responsePost);
  if (responsePost && responsePost.data && responsePost.data.result) {
    return responsePost;
  }
  if (responsePost && responsePost.data && responsePost.data.msg) {
    // console.log(responsePost);
    throw new Meteor.Error('error_call', responsePost.data.msg);
  } else {
    throw new Meteor.Error('error_server', 'error server');
  }
};

const callPixelMethodRest = (token, method, controller, action, post) => {
  // post['X-Auth-Token'] = token;
  // post['X-User-Id'] = Meteor.userId();
  post['json'] = 1;
  // console.log(post);
  const responsePost = HTTP.call(method, `${Meteor.settings.endpoint}/${controller}/${action}`, {
    headers: {
      'X-Auth-Token': token,
      'X-User-Id': Meteor.userId(),
      'X-Auth-Name': 'comobi',
      // Origin: 'https://co-mobile.communecter.org',
    },
    params: post,
    npmRequestOptions: {
      jar: true,
    },
  });
   // console.log(responsePost);
  if (responsePost && responsePost.data) {
    return responsePost;
  }
  throw new Meteor.Error('error_server', 'error server');
};

apiCommunecter.postPixel = function(controller, action, params) {
  const userC = Meteor.users.findOne({ _id: Meteor.userId() });
  // console.log(userC);
  // console.log(userC.services.resume.loginTokens[0]);
  
  if (userC && userC.profile && userC.profile.token) {
    const retour = callPixelRest(userC.profile.token, 'POST', controller, action, params);
    return retour;
  }
  throw new Meteor.Error('Error identification');
};

apiCommunecter.postPixelMethod = function(controller, action, params) {
  const userC = Meteor.users.findOne({ _id: Meteor.userId() });
  if (userC && userC.profile && userC.profile.token) {
    const retour = callPixelMethodRest(userC.profile.token, 'POST', controller, action, params);
    return retour;
  }
  throw new Meteor.Error('Error identification');
};

const dataUriToBuffer = (uri) => {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }

  // strip newlines
  uri = uri.replace(/\r?\n/g, '');

  // split the URI up into the "metadata" and the "data" portions
  const firstComma = uri.indexOf(',');
  if (firstComma === -1 || firstComma <= 4) throw new TypeError('malformed data: URI');

  // remove the "data:" scheme and parse the metadata
  const meta = uri.substring(5, firstComma).split(';');

  let base64 = false;
  for (let i = 0; i < meta.length; i += 1) {
    if (meta[i] === 'base64') {
      base64 = true;
    } else if (meta[i].indexOf('charset=') === 0) {
      charset = meta[i].substring(8);
    }
  }

  // get the encoded data portion and decode URI-encoded chars
  const data = unescape(uri.substring(firstComma + 1));

  const encoding = base64 ? 'base64' : 'ascii';
  // const buffer = new Buffer(data, encoding);
  const buffer = new Buffer.from(data, encoding);

  // set `.type` property to MIME type
  buffer.type = meta[0] || 'text/plain';

  // set the `.charset` property
  // buffer.charset = charset;

  return buffer;
};



const callPixelUploadRest = async (token, folder, ownerId, input, dataURI, name) => {
  const fileBuf = dataUriToBuffer(dataURI);
  const formData = {};

  const form = new FormData();

  formData[input] = {
    value: fileBuf,
    options: {
      filename: name,
      contentType: 'image/jpeg',
    },
  };


  const appendFormValue = function (key, value) {
    if (value && value.hasOwnProperty('value') && value.hasOwnProperty('options')) {
      form.append(key, value.value, value.options);
    } else {
      form.append(key, value);
    }
  };
  // eslint-disable-next-line no-restricted-syntax
  for (const formKey in formData) {
    if (formData.hasOwnProperty(formKey)) {
      const formValue = formData[formKey];
      if (formValue instanceof Array) {
        for (let j = 0; j < formValue.length; j++) {
          appendFormValue(formKey, formValue[j]);
        }
      } else {
        appendFormValue(formKey, formValue);
      }
    }
  }

  try {
    const response = await fetch(`${Meteor.settings.endpoint}/${Meteor.settings.module}/document/upload/dir/communecter/folder/${folder}/ownerId/${ownerId}/input/${input}`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': token,
        'X-User-Id': Meteor.userId(),
        'X-Auth-Name': 'comobi',
        ...form.getHeaders(),
        // 'Content-type': 'application/json'
      },
      body: form,
    });

    const data = await response.json();

    if (data && data.success === true) {
      // console.log(data);
      return data;
    }
    if (data && data.msg) {
      throw new Meteor.Error('error_call', data.msg);
    }
  } catch (error) {
    // your catch block code goes here
    throw new Meteor.Error('error_server', 'error server');
  }
};

const callPixelUploadSaveRest = async (token, folder, ownerId, input, dataURI, name, doctype, contentKey, params = null) => {
  const fileBuf = dataUriToBuffer(dataURI);
  const formData = {};

  const form = new FormData();

  formData[input] = {
    value: fileBuf,
    options: {
      filename: name,
      // contentType: 'image/jpeg',
    },
  };

  if (params) {
    if (params.parentId) {
      formData.parentId = params.parentId;
    }
    if (params.parentType) {
      formData.parentType = params.parentType;
    }
    if (input) {
      formData.formOrigin = input;
    }
  }

  const appendFormValue = function (key, value) {
    if (value && value.hasOwnProperty('value') && value.hasOwnProperty('options')) {
      form.append(key, value.value, value.options);
    } else {
      form.append(key, value);
    }
  };
  // eslint-disable-next-line no-restricted-syntax
  for (const formKey in formData) {
    if (formData.hasOwnProperty(formKey)) {
      const formValue = formData[formKey];
      if (formValue instanceof Array) {
        for (let j = 0; j < formValue.length; j++) {
          appendFormValue(formKey, formValue[j]);
        }
      } else {
        appendFormValue(formKey, formValue);
      }
    }
  }

  const contentKeyUrl = contentKey ? `/contentKey/${contentKey}` : '';

  // console.log(`${Meteor.settings.endpoint}/${Meteor.settings.module}/document/uploadSave/dir/communecter/folder/${folder}/ownerId/${ownerId}/input/${input}/docType/${doctype}${contentKeyUrl}`);

  // http://localhost:5080/co2/document/uploadSave/dir/communecter/folder/projects/ownerId/5eaf1e396908641b7a8b46c9/input/newsFile/docType/file

  // http://localhost:5080/co2/document/uploadSave/dir/communecter/folder/citoyens/ownerId/55ed9107e41d75a41a558524/input/newsFile/docType/file

  // http://localhost:5080/co2/document/uploadSave/dir/communecter/folder/projects/ownerId/5eaf1e396908641b7a8b46c9/input/newsImage/docType/image/contentKey/slider


  try {
    const response = await fetch(`${Meteor.settings.endpoint}/${Meteor.settings.module}/document/uploadSave/dir/communecter/folder/${folder}/ownerId/${ownerId}/input/${input}/docType/${doctype}${contentKeyUrl}`, {
      method: 'POST',
      headers: {
        'X-Auth-Token': token,
        'X-User-Id': Meteor.userId(),
        'X-Auth-Name': 'comobi',
        ...form.getHeaders(),
        // 'Content-type': 'application/json'
      },
      body: form,
    });

    const data = await response.json();
     // console.log(data);
    if (data && data.success === true) {
      // console.log(data);
      return data;
    }
    if (data && data.msg) {
      throw new Meteor.Error('error_call', data.msg);
    }
  } catch (error) {
    // your catch block code goes here
    // console.log(error);
    throw new Meteor.Error('error_server', 'error server');
  }
};

apiCommunecter.postUploadPixel = async (folder, ownerId, input, dataBlob, name) => {
  const userC = Meteor.users.findOne({ _id: Meteor.userId() });
  if (userC && userC.profile && userC.profile.token) {
    const retour = await callPixelUploadRest(userC.profile.token, folder, ownerId, input, dataBlob, name);
    if (retour && retour.name) {
      return retour;
    }
    throw new Meteor.Error('Error upload');
  } else {
    throw new Meteor.Error('Error identification');
  }
};

apiCommunecter.postUploadSavePixel = async (folder, ownerId, input, dataBlob, name, doctype, contentKey, params = null) => {
  const userC = Meteor.users.findOne({
    _id: Meteor.userId()
  });
  if (userC && userC.profile && userC.profile.token) {
    const retour = await callPixelUploadSaveRest(userC.profile.token, folder, ownerId, input, dataBlob, name, doctype, contentKey, params);
    if (retour && retour.name) {
      return retour;
    }
    throw new Meteor.Error('Error upload');
  } else {
    throw new Meteor.Error('Error identification');
  }
};

apiCommunecter.authPixelRest = (email, pwd) => {
  const response = HTTP.call('POST', `${Meteor.settings.endpoint}/${Meteor.settings.module}/person/authenticatetoken`, {
    params: {
      pwd,
      email,
    },
    npmRequestOptions: {
      jar: true,
    },
  });
  return response;
};
