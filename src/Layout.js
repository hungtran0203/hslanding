import React, { Component } from 'react';
import { Grid, Button, Table, FormControl } from 'react-bootstrap';
import _ from 'lodash';
import { getToken }from './service';
import * as urlService from './service';

const uuidv4 = require('uuid/v4');
const ITEM_STORAGE_KEY = 'HSITEM';
export default class Layout extends Component {
  state = {
    items: [],
    editingItem: null,
  }

  defaultItems = []

  loadItems () {
    let items = this.defaultItems;
    try {
      items = JSON.parse(localStorage.getItem(ITEM_STORAGE_KEY)) || [];
    }
    catch(err) {
      console.log(err)
    }
    this.setState({items});
  }

  componentDidMount() {
    this.loadItems()
  }

  updateItemsList(items) {
    // store to local storage
    localStorage.setItem(ITEM_STORAGE_KEY, JSON.stringify(items));
    this.setState({items});
  }

  handleRemoveItem = _.memoize((key) => {
    return () => {
      this.updateItemsList(_.filter(this.state.items, (item) => key !== item.key))
    }
  })

  getItemByKey = (key) => {
    return this.state.items.find((item) => item.key === key)
  }

  handleEditItem = _.memoize((key) => {
    return () => {
      this.setState({editingItem: key})
    }
  })

  handleSaveItem = (itemValue) => {
    const item = this.getItemByKey(itemValue.key)
    if(item) {
      Object.assign(item, itemValue)
      this.updateItemsList([...this.state.items]);
    }
    else {
      this.updateItemsList([...this.state.items, itemValue]);
    }
    
    this.handleDoneEditMode()
  }

  handleDoneEditMode = () => {
    this.setState({editingItem: null})
  }

  handleOpenItem = _.memoize((key) => {
    return async () => {
      try {
        const item = this.getItemByKey(key)
        if(!item) throw Error('Invalid item')
        await this.updateStatus({statusMsg: 'getting token'})
        const token = await getToken(item);
        const { id_token } = token;
        this.handleSaveItem({...item, id_token})

        await this.updateStatus({statusMsg: 'configuring token'})
        await this.configureCookie(item, id_token);

        await this.updateStatus({statusMsg: 'getting namespace'})
        const ns = await urlService.getNamespace({token: id_token, env: item.env || 'qa'})
        
        await this.updateStatus({statusMsg: 'opening landing page'})
        this.handleSaveItem({...item, basePath: ns.basePath})
        await this.openLandingPage(item)
        await this.updateStatus({statusMsg: ''})
      }
      catch(err) {
        console.log('ererere', err)
      }
    }
  })

  updateStatus = ({statusMsg}) => {
    if(this.statusRef) {
      return this.statusRef.setState({statusMsg})
    }
  }

  openLandingPage(item) {
    return new Promise((resolve) => {
      // eslint-disable-next-line
      chrome.tabs.update({
        url: this.buildLandingPageUrl(item)
      }, resolve);
    })
  }

  buildLandingPageUrl(item) {
    const { basePath } = item;
    const host = urlService.getURL_apps(item)
    const appName = 'catalyst-inv-core-spa-ui';
    return `${host}${basePath}/${appName}`
  }

  configureCookie(item, cookie) {
    let domains = domains = ['authz', 'api', 'apps', 'inventory'].map(type => {
      if(urlService[`getURL_${type}`]) {
        return urlService[`getURL_${type}`].apply(this, [item]);
      }
    })

    return Promise.all(_.compact(domains).map(url => {
      return new Promise((resolve) => {
        // eslint-disable-next-line
        chrome.cookies.set({
          url,
          name: 'ID_TOKEN',
          value: cookie,
          path: '/'
        }, resolve)
      })
    }))
  }

  renderReadModeRow(item) {
    const { key } = item;
    return (
      <tr key={key}>
        <th></th>
        <td>{item.username}</td>
        <td>{item.password}</td>
        <td>{item.env}</td>
        <td>{item.fe}</td>
        <td>{item.be}</td>
        <td>
          <Button bsSize="xsmall" onClick={this.handleOpenItem(key)}>Open</Button>
          <Button bsSize="xsmall" onClick={this.handleEditItem(key)}>Edit</Button>
          <Button bsSize="xsmall" onClick={this.handleRemoveItem(key)}>Remove</Button>
        </td>
      </tr>      
    );
  }

  renderRow (item) {
    return item.key === this.state.editingItem ? 
      this.renderEditModeRow(item):
      this.renderReadModeRow(item);
  }

  renderEditModeRow(item) {
    const itemValue = {key: uuidv4(), env: 'qa', ...item}
    const updateItemValue = _.memoize((field) => (e) => {
      itemValue[field] = e.target.value
    });

    const handleSubmit = () => {
      this.handleSaveItem(itemValue)
    }
    const { key } = itemValue;
    const isNew = !this.getItemByKey(key)
    return (
      <tr key={key}>
        <th></th>
        <td>
          <FormControl componentClass="input"  defaultValue={itemValue.username} onChange={updateItemValue('username')}/>
        </td>
        <td>
          <FormControl componentClass="input" defaultValue={itemValue.password} onChange={updateItemValue('password')}/>
        </td>
        <td>
        <FormControl componentClass="select" placeholder="select" defaultValue={itemValue.env} onChange={updateItemValue('env')} >
        <option value="qa">qa</option>
        <option value="dev">dev</option>
        <option value="stg">stg</option>
        <option value="prd">prd</option>
        </FormControl>
        </td>
        <td>
          <FormControl componentClass="input"  defaultValue={itemValue.fe} onChange={updateItemValue('fe')} />
        </td>
        <td>
          <FormControl componentClass="input"  defaultValue={itemValue.be} onChange={updateItemValue('be')}/>
        </td>
        <td>
          <Button bsSize="xsmall" onClick={handleSubmit}>{ isNew ? 'Add': 'Save' }</Button>
          {
            isNew ?
            null :
            <Button bsSize="xsmall" onClick={this.handleDoneEditMode}>Cancel</Button>
          }
        </td>
      </tr>      
    );
  }

  renderHeader() {
    return (
      <thead>
      <tr>
        <th>#</th>
        <th>Username</th>
        <th>Password</th>
        <th>ENV</th>
        <th>FE</th>
        <th>BE</th>
        <th>Action</th>
      </tr>
    </thead>
    )
  }

  render() {
    return (
    <Grid fluid>
      <Table responsive>
        { this.renderHeader() }
        <tbody>
          { this.state.items.map((item) => this.renderRow(item)) }
          { this.renderEditModeRow({}) }
        </tbody>
      </Table>
      <StatusVerbose ref={(ref) => this.statusRef = ref}/>
    </Grid>
    );
  }
}

class StatusVerbose extends Component {
  state = {
    statusMsg: ''
  }
  render() {
    if(this.state.statusMsg) {
      return (
        <div>Status: {this.state.statusMsg}</div>
      )  
    }
    return null
  }
}