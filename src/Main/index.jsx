import React from 'react';
import { Upload, Button, Select,Message } from '@alifd/next';
import { v4 as uuidv4 } from 'uuid';

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'video',
      files: []
    };
  }

  handleChange = (v) => {
    this.setState({ mode: v });
  }

  onVideoSuccess = (file, value) => {
    window.location.href = `/video?uid=${file.response.uid}&filename=${file.name}`
  };

  onImageSuccess = (file, value) => {
    window.location.href = `/image?uid=${file.response.uid}&filename=${file.name}`
  };

  onChange = (value, file) => {
    this.setState({files: value})    
  }

  onError = (file, value) => {
    console.log('file : ', file);
    console.log('value : ', value);
  };

  handleImageUpload = () => {
    let suffixList = []
    let fileFix = ''
    console.log('this.state.files', this.state.files)
    for (let i of this.state.files) {
      const sp = i.name.split('.')
      if (sp.length !== 2) {
        Message.show({
          type: 'error',
          title: '错误',
          content: '非法图片',
          hasMask: true,
        });
        return
      }
      fileFix = sp[1]
      suffixList.push(sp[1])
    }
    
    const suffixSet = new Set(suffixList)
    if (suffixSet.size > 1) {
      Message.show({
        type: 'error',
        title: '错误',
        content: '不能选择不同格式图片',
        hasMask: true,
      });
      return
    }
    if (this.state.files.length > 0) {
      const uid = uuidv4();
      for (let i of this.state.files) {
        const file = i
         // 创建FormData对象，并添加文件
        const formData = new FormData();
        formData.append('file', file.originFileObj);
        // 使用fetch上传文件
        fetch(`http://192.168.178.52:8080/uploadImage?uid=${uid}`, { // 替换为你的上传API端点
            method: 'POST',
            body: formData,
        })
        .then(response => response.json()) // 假设服务器返回JSON响应
        .then(result => {
            console.log('Success:', result);
        })
        .catch(error => {
            console.error('Error:', error);
        });
      }
      window.location.href = `/multiimage?uid=${uid}&fileFix=${fileFix}`
    }
  }

  render() {
    return (
      <div >
       <div>
       <Select
          size='large'
          style={{width: '300px'}}
          onChange={this.handleChange}
          defaultValue="video"
          dataSource={[
            { value: 'video', label: 'Upload Video' },
            { value: 'image', label: 'Upload Single Image' },
            // { value: 'multiimage', label: 'Upload Multi Image' },
          ]}
        />
       </div>
        <div style={{height: '100px'}}></div>
        {this.state.mode === 'video' ? (
          <div>
            <Upload
            listType='text'
            limit={1}
            accept="video/*"
            action="http://192.168.178.52:8080/uploadVideo"
            // beforeUpload={beforeUpload}
            // onChange={onChange}
            onSuccess={this.onVideoSuccess}
            onError={this.onError}
            key="1"
            >
      <Button type="primary" style={{ margin: '0 0 10px' }}>
        Upload Video
      </Button>
    </Upload>
          </div>
        ) : this.state.mode === 'image' ? (
          <div><Upload
          listType='text'
          limit={1}
          accept="image/*"
          action="http://192.168.178.52:8080/uploadVideo"
          // beforeUpload={beforeUpload}
          // onChange={onChange}
          onSuccess={this.onImageSuccess}
          onError={this.onError}
          key="1"
          >
          <Button type="primary" style={{ margin: '0 0 10px' }}>
            Upload Image
          </Button>
        </Upload>
          </div>
        ): (
          <div><Upload
          listType='text'
          multiple
          accept="image/*"
          // action="http://192.168.178.52:8080/uploadImage"
          // beforeUpload={this.beforeUpload}
          onChange={this.onChange}
          onSuccess={this.onImageSuccess}
          onError={this.onError}
          key="1"
          >
          <Button type="primary" style={{ margin: '0 0 10px' }}>
            Upload Image
          </Button>
        </Upload>
          <div style={{marginTop: '50px'}}><Button text type="primary" onClick={this.handleImageUpload}>Next Step</Button></div>
          </div>
        )}
        {/* <div style={{marginTop: '50px'}}><Link to={this.state.mode}>Next Step</Link></div> */}
      </div>
    );
  }
}

export default Main;
