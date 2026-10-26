import { all, fork } from 'redux-saga/effects'
import { adminSaga } from './admin/adminSaga'
import { authSaga } from './auth/authSaga'
import { darshanSaga } from './darshan/darshanSaga'
import { i18nSaga } from './i18n/i18nSaga'
import { noticesSaga } from './notices/noticesSaga'
import { ordersSaga } from './orders/ordersSaga'
import { templesSaga } from './temples/templesSaga'
import { vazhipaduSaga } from './vazhipadu/vazhipaduSaga'

export function* rootSaga() {
  yield all([
    fork(adminSaga),
    fork(authSaga),
    fork(darshanSaga),
    fork(vazhipaduSaga),
    fork(i18nSaga),
    fork(noticesSaga),
    fork(ordersSaga),
    fork(templesSaga),
  ])
}
