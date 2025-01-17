import { StoryFn as StoryFunction, useChannel, DecoratorFunction } from '@storybook/addons'

import React from 'react'
import { Provider } from 'react-redux'
import { AnyAction } from 'redux'
import { diff as differ } from 'jsondiffpatch'
import { EVENTS } from './constants'
import { OnDispatchEvent, OnInitEvent, StoreListener } from './typings'
import { mergeStateAction, setStateAction } from './actionCreators'
import { getStore } from './enhancer'

let nextId = 0

export default (): DecoratorFunction => {
  return (story: StoryFunction) => {
    const store = getStore()

    const emit = useChannel({
      [EVENTS.SET_STATE]: (stateJson: string) => store.dispatch(setStateAction(JSON.parse(stateJson))),
      [EVENTS.MERGE_STATE]: (stateJson: string) => store.dispatch(mergeStateAction(JSON.parse(stateJson))),
      [EVENTS.DISPATCH]: (action: AnyAction) => store.dispatch(action)
    })

    const onDispatchListener: StoreListener = (action, prev, next): void => {
      const diff = differ(prev, next)
      const date = new Date()
      const event: OnDispatchEvent = { id: nextId++, date, action, diff, prev, next, state: JSON.stringify(next) }
      emit(EVENTS.ON_DISPATCH, event)
    }

    const initEvent: OnInitEvent = { state: JSON.stringify(store.getState()) }
    emit(EVENTS.INIT, initEvent)

    if (store.__WITH_REDUX_ENABLED__ === undefined) throw new Error('withRedux enhancer is not enabled in the store')

    store.__WITH_REDUX_ENABLED__?.listenToStateChange(onDispatchListener)

    return (<Provider store={store}> {story()} </Provider>)
  }
}
