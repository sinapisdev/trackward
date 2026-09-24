# Os modelos de e-mail

Eles moram no painel do Supabase, em **Authentication > Emails > Templates**, e não
no código: o que está aqui é a cópia do que deve ser colado lá, para não se perder.

## Por que trocar o modelo padrão

O link padrão (`{{ .ConfirmationURL }}`) sai no formato **PKCE**: metade da chave viaja
no e-mail e a outra metade fica num cookie do navegador que pediu. Isso significa que
**abrir o link em outro aparelho não funciona**, e esse é o caso normal: a pessoa pede a
troca no computador e abre o e-mail no celular.

O formato `token_hash` não guarda nada em cookie. Ele é conferido no servidor, em
`/auth/confirmar`, com `verifyOtp`, e por isso atravessa aparelho, navegador e rede.

O que se perde: nada de segurança relevante. O token continua valendo **uma hora e um
uso só**, e é o mesmo comportamento de recuperação de senha de qualquer serviço.

## O que colar

| modelo | arquivo | `type=` |
| --- | --- | --- |
| Reset Password | `recuperar-senha.html` | `recovery` |
| Confirm signup | mesmo corpo, trocando o texto | `signup` |
| Invite user | mesmo corpo, trocando o texto | `invite` |
| Magic Link | mesmo corpo, trocando o texto | `magiclink` |

O `{{ .SiteURL }}` vem do campo **Site URL**, em Authentication > URL Configuration.
Com ele apontando para `https://trackward.app`, o link inteiro sai certo sozinho.

O `proximo=` diz para onde ir depois de abrir a sessão. Na recuperação é
`/nova-senha`; nos outros, `/`.
