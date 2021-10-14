import {UrlResolver, UrlType} from '../RenderOptions'

export default class SimpleUrlResolver implements UrlResolver {
  resolve(url: string, type: UrlType): string {
    if (type === 'email') {
      return `mailto:${url}`
    } else {
      return url
    }
  }
}
