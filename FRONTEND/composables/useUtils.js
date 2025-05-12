import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/it'
import 'dayjs/locale/en'

dayjs.extend(relativeTime)
dayjs.locale('it')


export async function getDateDifferenceFromNow(date) {
    if (date) {
        return dayjs(date).fromNow()
    }
    return null
}