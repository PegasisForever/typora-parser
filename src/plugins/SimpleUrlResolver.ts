import {UrlResolver, UrlType} from '../RenderOption'

export default class SimpleUrlResolver implements UrlResolver {
  resolve(url: string, type: UrlType): string {
    if (type === 'email') {
      return `mailto:${url}`
    } else {
      return url
    }
  }
}
