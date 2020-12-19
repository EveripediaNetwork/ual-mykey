import ScatterJS from '@scatterjs/core'
import ScatterEOS from '@scatterjs/eosjs2'
import {
  Authenticator, ButtonStyle, Chain,
  UALError, UALErrorType, User
} from 'universal-authenticator-library'
import { Name } from './interfaces'
import { mykeyLogo } from './mykeyLogo'
import { MyKeyUser } from './MyKeyUser'
import { UALMyKeyError } from './UALMyKeyError'

declare let window: any

export class MyKey extends Authenticator {
  private users: MyKeyUser[] = []
  private scatter: any
  private appName: string
  private scatterIsLoading: boolean = false
  private initError: UALError | null = null

  /**
   * MyKey Constructor.
   *
   * @param chains
   * @param options { appName } appName is a required option to use MyKey
   */
  constructor(chains: Chain[], options?: any) {
    super(chains)
    if (options && options.appName) {
      this.appName = options.appName
    } else {
      throw new UALMyKeyError('MyKey requires the appName property to be set on the `options` argument.',
        UALErrorType.Initialization,
        null)
    }
  }

  /**
   * Checks MyKey for a live connection.  Will set an Initialization Error
   * if we cannot connect to scatter.
   */
  public async init(): Promise<void> {
    this.scatterIsLoading = true
    ScatterJS.plugins(new ScatterEOS())

    // set an errored state if scatter doesn't connect
    if (!await ScatterJS.scatter.connect(this.appName)) {
      this.initError = new UALMyKeyError('Error occurred while connecting',
        UALErrorType.Initialization,
        null
      )

      this.scatterIsLoading = false

      return
    }

    this.scatter = ScatterJS.scatter
    window.ScatterJS = null

    this.scatterIsLoading = false
  }

  public reset(): void {
    this.initError = null
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.init()
  }

  public isLoading(): boolean {
    return this.scatterIsLoading
  }

  public isErrored(): boolean {
    return !!this.initError
  }

  public getError(): UALError | null {
    return this.initError
  }

  public getStyle(): ButtonStyle {
    return {
      icon: mykeyLogo,
      text: Name,
      textColor: 'white',
      background: '#000'
    }
  }

  /**
   * MyKey will only render
   */
  public shouldRender(): boolean {
    // @ts-ignore
    return window?.ethereum?.isMYKEY;
  }

  public shouldAutoLogin(): boolean {
    return false
  }

  public async login(_?: string): Promise<User[]> {
    this.users = []

    try {
      for (const chain of this.chains) {
        const user = new MyKeyUser(chain, this.scatter)
        await user.getKeys()
        this.users.push(user)
      }

      return this.users
    } catch (e) {
      throw new UALMyKeyError(
        'Unable to login',
        UALErrorType.Login,
        e)
    }
  }

  /**
   * Call logout on scatter.  Throws a Logout Error if unsuccessful
   */
  public async logout(): Promise<void> {
    try {
      this.scatter.logout()
    } catch (error) {
      throw new UALMyKeyError('Error occurred during logout',
        UALErrorType.Logout,
        error)
    }
  }

  /**
   * MyKey provides account names so it does not need to request it
   */
  public async shouldRequestAccountName(): Promise<boolean> {
    return false
  }

  public isMobile(): boolean {
    const userAgent = window.navigator.userAgent
    const isIOS = userAgent.includes('iPhone') || userAgent.includes('iPad')
    const isMobile = userAgent.includes('Mobile')
    const isAndroid = userAgent.includes('Android')
    const isCustom = userAgent.toLowerCase().includes('eoslynx')

    return isIOS || isMobile || isAndroid || isCustom
  }

  public getOnboardingLink(): string {
    return 'https://get-scatter.com/'
  }

  public requiresGetKeyConfirmation(): boolean {
    return false
  }

  public getName(): string {
    return Name
  }
}